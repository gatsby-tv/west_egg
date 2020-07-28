defmodule WestEgg.Register.Show do
  use WestEgg.Register,
    prefix: "show",
    bucket: :shows,
    spec: [
      handle: :required,
      title: :required,
      channel: :required,
      owners: :optional,
      channel_id: :phantom
    ]

  @impl true
  def register(conn, params, _opts) do
    params
    |> fetch(:owners)
    |> fetch(:channel)
    |> authorize(conn)
    |> validate(:handle)
    |> validate(:title)
    |> build_handle()
    |> stage(:registry)
    |> stage(:profile)
    |> stage(:owners)
    |> stage(:channel)
    |> stage(:users)
    |> finish(conn)
  end

  defp fetch(%{channel: channel} = params, :channel) do
    case Repo.lookup(:repo, :channel, channel) do
      {:ok, id} -> Map.put(params, :channel_id, id)
      {:error, %Repo.NotFoundError{}} -> fail("unknown channel, '#{channel}'")
      {:error, reason} -> raise reason
    end
  end

  defp validate(%{handle: handle, channel: channel} = params, :handle) do
    case Validate.handle(:show, {channel, handle}) do
      :ok -> params
      {:error, reason} -> fail(reason)
    end
  end

  defp validate(%{title: title} = params, :title) do
    case Validate.title(:show, title) do
      :ok -> params
      {:error, reason} -> fail(reason)
    end
  end

  defp build_handle(%{handle: handle, channel: channel} = params),
    do: Map.put(params, :handle, "#{channel}#{handle}")

  defp authorize(%{channel_id: channel} = params, conn) do
    cond do
      not Auth.verified?(conn) -> raise Auth.AuthorizationError
      not Auth.owns?(conn, channel: channel) -> raise Auth.AuthorizationError
      true -> params
    end
  end

  defp stage(params, :profile) do
    %{
      id: id,
      handle: handle,
      title: title,
      channel_id: channel
    } = params

    now = DateTime.utc_now() |> DateTime.to_unix() |> to_string()

    methods = %{
      "_type" => Repo.set("application/riak_map"),
      "handle" => Repo.set(handle),
      "title" => Repo.set(title),
      "channel" => Repo.set(channel),
      "creation_time" => Repo.set(now)
    }

    Repo.modify(:repo, :shows, id, :profile, methods)
    params
  end

  defp stage(%{id: id, owners: owners} = params, :owners) do
    methods = %{
      "_type" => Repo.set("application/riak_set"),
      "owners" => Repo.add_elements(owners)
    }

    Repo.modify(:repo, :shows, id, :owners, methods)
    params
  end

  defp stage(%{id: id, channel_id: channel} = params, :channel) do
    methods = %{
      "_type" => Repo.set("application/riak_set"),
      "shows" => Repo.add_element(id)
    }

    Repo.modify(:repo, :channels, channel, :shows, methods)
    params
  end

  defp stage(%{id: id, owners: owners} = params, :users) do
    methods = %{
      "_type" => Repo.set("application/riak_set"),
      "shows" => Repo.add_element(id)
    }

    for owner <- owners do
      Repo.modify(:repo, :users, owner, :shows, methods)
    end

    params
  end
end
